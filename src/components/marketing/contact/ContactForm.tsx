'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

interface ContactFormProps {
  /** Destination email; the form composes a message via the visitor's mail client. */
  email: string;
}

const SUBJECTS = ['سوال قبل از خرید پلن', 'پشتیبانی فنی', 'همکاری و فروش سازمانی', 'سایر موارد'];

export default function ContactForm({ email }: ContactFormProps) {
  const [name, setName] = useState('');
  const [from, setFrom] = useState('');
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<{ name?: string; from?: string; message?: string }>({});

  const validate = () => {
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'نام خود را وارد کنید.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from.trim())) next.from = 'ایمیل معتبر وارد کنید.';
    if (message.trim().length < 10) next.message = 'پیام حداقل ۱۰ کاراکتر باشد.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    trackEvent('contact_submit', { cta_location: 'contact_form' });
    const body = `نام: ${name}\nایمیل: ${from}\nموضوع: ${subject}\n\n${message}`;
    const href = `mailto:${email}?subject=${encodeURIComponent(`[برسانا] ${subject}`)}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
  };

  const inputClass =
    'w-full rounded-xl border border-mk-line bg-mk-surface px-4 py-3 text-xs font-semibold text-mk-strong outline-none transition-colors placeholder:text-mk-muted focus:border-primary-500 dark:text-white';

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="cf-name" className="block text-[11px] font-black text-mk-strong dark:text-white">
            نام و نام خانوادگی
          </label>
          <input
            id="cf-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="مثلاً علی رضایی"
            aria-invalid={!!errors.name}
          />
          {errors.name && <p className="text-[10px] font-bold text-red-500">{errors.name}</p>}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="cf-email" className="block text-[11px] font-black text-mk-strong dark:text-white">
            ایمیل
          </label>
          <input
            id="cf-email"
            type="email"
            dir="ltr"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={`${inputClass} text-left`}
            placeholder="you@example.com"
            aria-invalid={!!errors.from}
          />
          {errors.from && <p className="text-[10px] font-bold text-red-500">{errors.from}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="cf-subject" className="block text-[11px] font-black text-mk-strong dark:text-white">
          موضوع
        </label>
        <select
          id="cf-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className={inputClass}
        >
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="cf-message" className="block text-[11px] font-black text-mk-strong dark:text-white">
          پیام شما
        </label>
        <textarea
          id="cf-message"
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={`${inputClass} resize-y`}
          placeholder="سوال یا درخواست خود را بنویسید…"
          aria-invalid={!!errors.message}
        />
        {errors.message && <p className="text-[10px] font-bold text-red-500">{errors.message}</p>}
      </div>

      <button
        type="submit"
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-xs font-black text-white transition-all hover:bg-primary-700 active:scale-[0.98] sm:w-auto"
      >
        <Send className="h-4 w-4" aria-hidden="true" />
        ارسال پیام
      </button>
      <p className="text-[10px] font-bold leading-relaxed text-mk-muted">
        با کلیک روی ارسال، پیام در برنامه ایمیل شما آماده می‌شود تا به {email} ارسال کنید.
      </p>
    </form>
  );
}
