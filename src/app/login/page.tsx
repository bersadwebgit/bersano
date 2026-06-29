'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BottomNav from '@/components/layout/BottomNav';
import { Phone, Mail, Lock, ArrowRight, RefreshCw, Sparkles, Check } from 'lucide-react';

export default function CustomerLogin() {
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
  const [shopSettings, setShopSettings] = useState<{ shopName: string; logoUrl: string | null } | null>(null);

  // Fetch Shop Settings
  useEffect(() => {
    fetch('/api/settings/public')
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) {
          setShopSettings({
            shopName: data.settings.shopName,
            logoUrl: data.settings.logoUrl,
          });
        }
      })
      .catch((err) => console.error('Error fetching shop settings:', err));
  }, []);

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
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newOtpValues = [...otpValues];
    newOtpValues[index] = value;
    setOtpValues(newOtpValues);

    // Auto-focus next input if value is entered
    if (value && index < 4) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 5 digits are entered
    const fullCode = newOtpValues.join('');
    if (fullCode.length === 5) {
      handleVerifyOtp(undefined, fullCode);
    }
  };

  // Handle OTP Backspace / Keydowns
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpValues[index] && index > 0) {
        // If current box is empty, delete previous box value and focus it
        const newOtpValues = [...otpValues];
        newOtpValues[index - 1] = '';
        setOtpValues(newOtpValues);
        otpRefs.current[index - 1]?.focus();
      } else {
        // If current box has a value, just clear it
        const newOtpValues = [...otpValues];
        newOtpValues[index] = '';
        setOtpValues(newOtpValues);
      }
    }
  };

  // Handle Send OTP SMS
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
        setTimer(120); // 2 minutes countdown
        setInfo('کد تایید با موفقیت پیامک شد.');
        // Clear previous OTP boxes
        setOtpValues(['', '', '', '', '']);
        // Focus first box with delay to allow UI transition
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

  // Handle Verify OTP
  const handleVerifyOtp = async (e?: React.FormEvent, codeToVerify?: string) => {
    if (e) e.preventDefault();
    setError('');
    setInfo('');
    
    const fullCode = codeToVerify || otpValues.join('');
    if (fullCode.length < 5) {
      setError('لطفا کد تایید ۵ رقمی را به طور کامل وارد کنید');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: fullCode, role: 'customer' }),
      });

      const data = await res.json();

      if (res.ok) {
        setIsSuccess(true);
        localStorage.removeItem('shop-favorites-storage');
        
        // Dynamic smooth redirect
        setTimeout(() => {
          router.push('/profile');
          router.refresh();
        }, 2500);
      } else {
        setError(data.error || 'کد وارد شده صحیح نیست');
      }
    } catch (err) {
      setError('خطا در تایید کد');
    } finally {
      setLoading(false);
    }
  };

  // Handle Standard Email/Password Login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setIsSuccess(true);
        localStorage.removeItem('shop-favorites-storage');
        
        setTimeout(() => {
          router.push('/profile');
          router.refresh();
        }, 2500);
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
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans pb-24 flex flex-col justify-between" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {shopSettings?.logoUrl ? (
            <div className="w-8 h-8 relative overflow-hidden rounded-lg flex-shrink-0 flex items-center justify-center">
              <img
                src={shopSettings.logoUrl}
                alt={shopSettings.shopName}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              {shopSettings?.shopName ? (
                <span className="text-white font-bold text-xs">{shopSettings.shopName.charAt(0)}</span>
              ) : (
                <Sparkles className="w-5 h-5 text-white" />
              )}
            </div>
          )}
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            {shopSettings?.shopName ? `ورود به ${shopSettings.shopName}` : 'ورود خریداران'}
          </span>
        </div>
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white font-medium">
          برگشت به خانه
        </Link>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-4 flex items-center justify-center my-6">
        <div className="w-full max-w-md bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-3xl shadow-xl shadow-gray-100 dark:shadow-none border border-gray-100 dark:border-gray-800">
          
          {/* Shop Logo & Name (Minimal) */}
          {shopSettings && (
            <div className="flex flex-col items-center mb-6">
              {shopSettings.logoUrl ? (
                <div className="w-16 h-16 mb-3 relative overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-center p-1 bg-white dark:bg-gray-950 shadow-sm">
                  <img
                    src={shopSettings.logoUrl}
                    alt={shopSettings.shopName}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 mb-3 rounded-2xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-2xl shadow-sm">
                  {shopSettings.shopName.charAt(0)}
                </div>
              )}
              <h2 className="text-lg font-black text-gray-900 dark:text-white">{shopSettings.shopName}</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">به حساب کاربری خود وارد شوید</p>
            </div>
          )}
          
          {/* Tabs */}
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl mb-8">
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
              ورود با پیامک (سریع)
            </button>
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
              ورود با ایمیل
            </button>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-2xl text-sm border border-rose-100 dark:border-rose-900/30 flex items-start gap-2 animate-shake">
              <span className="font-semibold">⚠️ خطا:</span>
              <span>{error}</span>
            </div>
          )}

          {info && (
            <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-2xl text-sm border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-2">
              <Check className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} />
              <span>{info}</span>
            </div>
          )}

          {/* Method 1: OTP / SMS Login */}
          {loginMethod === 'otp' && (
            <div>
              {!otpSent ? (
                /* Step 1: Request OTP Phone Number */
                <form onSubmit={handleSendOtp} className="space-y-6">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-black text-gray-900 dark:text-white">شماره همراه خود را وارد کنید</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">کد تایید ۵ رقمی برای شما ارسال خواهد شد</p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                      شماره موبایل
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pr-11 pl-4 py-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all text-left font-semibold text-lg tracking-wider"
                        placeholder="09123456789"
                        required
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-4 px-4 rounded-2xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2 text-md"
                  >
                    {loading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      'ارسال کد تایید'
                    )}
                  </button>
                </form>
              ) : (
                /* Step 2: Verify OTP Code */
                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-black text-gray-900 dark:text-white">کد تایید را وارد کنید</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      کد ارسال شده به شماره <span className="font-bold text-gray-800 dark:text-gray-200" dir="ltr">{phone}</span> را وارد کنید
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
                      کد ۵ رقمی تایید
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
                          className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-black rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
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
                        className="text-sm text-blue-600 font-extrabold hover:text-blue-700 flex items-center gap-1.5 mx-auto hover:underline"
                      >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> ارسال مجدد کد تایید
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-4 px-4 rounded-2xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2 text-md"
                  >
                    {loading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      'تایید و ورود'
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Method 2: Standard Password Login */}
          {loginMethod === 'password' && (
            <form onSubmit={handlePasswordLogin} className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-black text-gray-900 dark:text-white">ورود با ایمیل و رمز عبور</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">اطلاعات حساب کاربری خود را وارد کنید</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  ایمیل
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pr-11 pl-4 py-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all font-medium text-md"
                    placeholder="example@gmail.com"
                    required
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                    رمز عبور
                  </label>
                  <a href="#" className="text-xs text-blue-600 hover:underline font-bold">
                    فراموشی رمز عبور؟
                  </a>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pr-11 pl-4 py-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all text-left font-mono text-lg tracking-widest"
                    placeholder="••••••••"
                    required
                    dir="ltr"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-4 px-4 rounded-2xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2 text-md mt-4"
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  'ورود به حساب'
                )}
              </button>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 text-center text-sm text-gray-500 dark:text-gray-400 font-medium">
            حساب کاربری ندارید؟{' '}
            <Link href="/register" className="text-blue-600 font-bold hover:underline">
              ثبت نام کنید
            </Link>
          </div>
        </div>
      </main>

      <BottomNav />

      {isSuccess && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 dark:bg-black/95 backdrop-blur-xl animate-fade-in">
          <div className="flex flex-col items-center max-w-sm p-8 text-center">
            {/* Beautiful Success Animation */}
            <div className="relative flex items-center justify-center w-20 h-20 mb-6">
              {/* Outer pulsing ring */}
              <div className="absolute inset-0 rounded-full bg-emerald-500/10 dark:bg-emerald-500/5 animate-ping" style={{ animationDuration: '2s' }} />
              {/* Middle pulsing ring */}
              <div className="absolute w-16 h-16 rounded-full bg-emerald-500/20 dark:bg-emerald-500/10 animate-pulse" style={{ animationDuration: '2.5s' }} />
              {/* Inner solid circle */}
              <div className="absolute w-12 h-12 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center animate-scale-up">
                <Check className="w-6 h-6 text-emerald-500" strokeWidth={1.5} />
              </div>
            </div>

            {/* Glowing sparkles */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <Sparkles className="w-24 h-24 text-emerald-500/5 animate-spin" style={{ animationDuration: '12s' }} strokeWidth={1} />
            </div>

            <h3 className="text-2xl font-black text-gray-900 dark:text-white animate-fade-in-up-css">
              ورود با موفقیت انجام شد
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 animate-fade-in-up-css" style={{ animationDelay: '0.2s' }}>
              خوش آمدید! در حال انتقال به حساب کاربری...
            </p>

            {/* Progress Bar */}
            <div className="w-48 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mt-8 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full animate-progress-bar" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
