'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Store, Phone, Mail, Lock, ArrowRight, RefreshCw, Key, ShieldCheck } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  
  // Password States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // OTP States
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpValues, setOtpValues] = useState<string[]>(['', '', '', '', '']);
  const [timer, setTimer] = useState(0);
  
  // Status States
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  // OTP inputs refs
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newOtpValues = [...otpValues];
    newOtpValues[index] = value;
    setOtpValues(newOtpValues);

    if (value && index < 4) {
      otpRefs.current[index + 1]?.focus();
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

  // Send OTP
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
        setInfo('کد تایید امنیتی با موفقیت ارسال شد.');
        setOtpValues(['', '', '', '', '']);
        setTimeout(() => {
          otpRefs.current[0]?.focus();
        }, 100);
      } else {
        setError(data.error || 'خطا در ارسال پیامک');
      }
    } catch (err) {
      setError('خطا در برقراری ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP for Admin
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');

    const fullCode = otpValues.join('');
    if (fullCode.length < 5) {
      setError('لطفا کد تایید ۵ رقمی را به طور کامل وارد کنید');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: fullCode, role: 'admin' }),
      });

      const data = await res.json();

      if (res.ok) {
        setInfo('احراز هویت با موفقیت انجام شد. در حال ورود به پنل...');
        setTimeout(() => {
          router.push('/admin');
          router.refresh();
        }, 1000);
      } else {
        setError(data.error || 'کد تایید نامعتبر است');
      }
    } catch (err) {
      setError('خطا در تایید کد امنیتی');
    } finally {
      setLoading(false);
    }
  };

  // Standard Password Login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'اطلاعات ورود اشتباه است');
      }

      setInfo('ورود با موفقیت انجام شد. در حال انتقال...');
      setTimeout(() => {
        router.push('/admin');
        router.refresh();
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans" dir="rtl">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Store className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-black text-gray-900 dark:text-white">
          پنل مدیریت فروشگاه
        </h2>
        <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
          برای دسترسی به ابزارهای مدیریت فروشگاه خود احراز هویت کنید
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white dark:bg-gray-900 py-8 px-6 shadow-xl shadow-gray-100 dark:shadow-none sm:rounded-3xl border border-gray-100 dark:border-gray-800">
          
          {/* Method Selection Tabs */}
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl mb-8">
            <button
              onClick={() => {
                setLoginMethod('password');
                setError('');
                setInfo('');
              }}
              className={`flex-1 py-2.5 text-center font-bold text-sm rounded-xl transition-all ${
                loginMethod === 'password'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              رمز عبور مدیریت
            </button>
            <button
              onClick={() => {
                setLoginMethod('otp');
                setError('');
                setInfo('');
              }}
              className={`flex-1 py-2.5 text-center font-bold text-sm rounded-xl transition-all ${
                loginMethod === 'otp'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              ورود دو مرحله‌ای پیامکی
            </button>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-2xl text-sm border border-rose-100 dark:border-rose-900/30 flex items-start gap-2">
              <span className="font-bold">⚠️ خطا:</span>
              <span>{error}</span>
            </div>
          )}

          {info && (
            <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-2xl text-sm border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 flex-shrink-0" />
              <span>{info}</span>
            </div>
          )}

          {/* Method 1: Email and Password Login */}
          {loginMethod === 'password' && (
            <form className="space-y-6" onSubmit={handlePasswordLogin}>
              <div>
                <label htmlFor="email" className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                  ایمیل مدیریت
                </label>
                <div className="mt-2 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pr-11 pl-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all font-medium text-md"
                    placeholder="admin@example.com"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                  رمز عبور
                </label>
                <div className="mt-2 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pr-11 pl-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all text-left font-mono text-lg tracking-widest"
                    placeholder="••••••••"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4.5 w-4.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-lg"
                  />
                  <label htmlFor="remember-me" className="mr-2 block text-sm text-gray-900 dark:text-gray-300 font-medium">
                    مرا به خاطر بسپار
                  </label>
                </div>

                <div className="text-sm">
                  <a href="#" className="font-bold text-blue-600 hover:underline">
                    رمز عبور را فراموش کرده‌اید؟
                  </a>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 px-4 rounded-2xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2 text-md"
                >
                  {loading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    'ورود به پنل مدیریت'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Method 2: SMS OTP Login */}
          {loginMethod === 'otp' && (
            <div>
              {!otpSent ? (
                /* Step 1: Send OTP code */
                <form onSubmit={handleSendOtp} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                      شماره موبایل مدیر
                    </label>
                    <p className="text-xs text-gray-400 mt-1 mb-3">شماره همراه شما باید قبلاً در مشخصات مدیر ثبت شده باشد</p>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pr-11 pl-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all text-left font-semibold text-lg tracking-wider"
                        placeholder="09123456789"
                        required
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 px-4 rounded-2xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2 text-md"
                  >
                    {loading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      'ارسال کد تایید امنیتی'
                    )}
                  </button>
                </form>
              ) : (
                /* Step 2: Verify OTP code */
                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      کد تایید پیامک شده به شماره <span className="font-bold text-gray-800 dark:text-gray-200" dir="ltr">{phone}</span> را وارد کنید
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setError('');
                        setInfo('');
                      }}
                      className="text-xs text-blue-600 font-bold mt-2 hover:underline flex items-center gap-1 mx-auto"
                    >
                      <ArrowRight className="w-3.5 h-3.5" /> ویرایش شماره موبایل
                    </button>
                  </div>

                  {/* 5 digit inputs */}
                  <div>
                    <label className="block text-center text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">
                      کد امنیتی ۵ رقمی
                    </label>
                    <div className="flex justify-center gap-3" dir="ltr">
                      {[0, 1, 2, 3, 4].map((index) => (
                        <input
                          key={index}
                          ref={(el) => { otpRefs.current[index] = el; }}
                          type="text"
                          maxLength={1}
                          pattern="\d*"
                          inputMode="numeric"
                          value={otpValues[index]}
                          onChange={(e) => handleOtpChange(index, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(index, e)}
                          className="w-12 h-14 text-center text-2xl font-black rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Resend and timer */}
                  <div className="text-center">
                    {timer > 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        امکان ارسال مجدد کد پس از <span className="font-mono font-bold text-blue-600">{formatTime(timer)}</span>
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={loading}
                        className="text-sm text-blue-600 font-bold hover:text-blue-700 flex items-center gap-1.5 mx-auto hover:underline"
                      >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> ارسال مجدد کد امنیتی
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 px-4 rounded-2xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2 text-md"
                  >
                    {loading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      'احراز هویت و ورود'
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 text-center">
            <Link href="/" className="text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:underline flex items-center justify-center gap-1">
              <ArrowRight className="w-4 h-4" /> بازگشت به سایت
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
