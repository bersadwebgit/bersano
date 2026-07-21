'use client';

import { useState } from 'react';
import Link from 'next/link';
import { HelpCircle, Smile, RefreshCw } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

interface QuizPlan {
  id: string;
  name: string;
  ctaLink: string;
}

interface PricingQuizProps {
  plans: QuizPlan[];
}

/**
 * Interactive plan-recommendation quiz (client island).
 * The rest of the pricing page is server-rendered for SEO/performance.
 */
export default function PricingQuiz({ plans }: PricingQuizProps) {
  const [quizStep, setQuizStep] = useState(0);
  const [answers, setAnswers] = useState({ products: '', wholesale: '', domain: '', aiUsage: '', team: '' });

  const planById = (id: string) => plans.find((p) => p.id === id) || plans[0];

  const handleQuizAnswer = (key: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    if (quizStep < 5) setQuizStep(quizStep + 1);
    else setQuizStep(6);
  };

  const getRecommendedPlan = (): QuizPlan => {
    if (answers.wholesale === 'yes' || answers.team === 'yes' || answers.products === 'large') {
      return planById('growth');
    }
    if (answers.products === 'medium' || answers.domain === 'yes' || answers.aiUsage === 'daily' || answers.aiUsage === 'heavy') {
      return planById('professional');
    }
    return planById('start');
  };

  const resetQuiz = () => {
    setQuizStep(0);
    setAnswers({ products: '', wholesale: '', domain: '', aiUsage: '', team: '' });
  };

  const questions: Array<{ key: keyof typeof answers; title: string; options: { id: string; l: string }[] }> = [
    {
      key: 'products',
      title: 'تعداد حدودی تنوع محصولات شما چقدر است؟',
      options: [
        { id: 'small', l: 'کمتر از ۲۰ محصول' },
        { id: 'medium', l: 'بین ۲۰ تا ۵۰۰ محصول' },
        { id: 'large', l: 'بیش از ۵۰۰ محصول' },
      ],
    },
    {
      key: 'wholesale',
      title: 'آیا فروش عمده یا همکار (B2B) دارید؟',
      options: [
        { id: 'yes', l: 'بله؛ قیمت پله‌ای یا MOQ برای همکاران دارم.' },
        { id: 'no', l: 'خیر؛ فقط تک‌فروشی به مصرف‌کننده نهایی.' },
      ],
    },
    {
      key: 'domain',
      title: 'آیا می‌خواهید دامنه اختصاصی (.ir یا .com) متصل کنید؟',
      options: [
        { id: 'yes', l: 'بله؛ برند رسمی خودم را روی دامنه شخصی می‌خواهم.' },
        { id: 'no', l: 'خیر؛ فعلاً زیردامنه پیش‌فرض برسانا کافی است.' },
      ],
    },
    {
      key: 'aiUsage',
      title: 'چقدر قصد استفاده از هوش مصنوعی دارید؟',
      options: [
        { id: 'light', l: 'خیلی کم؛ بیشتر دستی وارد می‌کنم.' },
        { id: 'daily', l: 'روزانه؛ برای سئو و مشخصات محصول.' },
        { id: 'heavy', l: 'بسیار زیاد؛ مدیریت گفت‌وگویی انبار و فاکتور.' },
      ],
    },
    {
      key: 'team',
      title: 'آیا همکار یا تیم پشتیبانی با دسترسی اختصاصی دارید؟',
      options: [
        { id: 'yes', l: 'بله؛ همکارانم به بخش‌هایی دسترسی لازم دارند.' },
        { id: 'no', l: 'خیر؛ فقط خودم فروشگاه را اداره می‌کنم.' },
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-3xl rounded-3xl border border-mk-line bg-mk-surface-muted p-6 sm:p-10">
      {quizStep === 0 && (
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-600/10 text-primary-600">
            <HelpCircle className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-black text-mk-strong dark:text-white sm:text-base">
              نمی‌دانید کدام پلن مناسب کسب‌وکار شماست؟
            </h3>
            <p className="mx-auto max-w-md text-xs font-bold leading-relaxed text-mk-muted">
              به ۵ سوال کوتاه پاسخ دهید تا مناسب‌ترین پلن را پیشنهاد دهیم.
            </p>
          </div>
          <button
            onClick={() => {
              trackEvent('pricing_view', { cta_location: 'quiz_start' });
              setQuizStep(1);
            }}
            className="rounded-xl bg-primary-600 px-6 py-3 text-xs font-black text-white transition-all hover:bg-primary-700 active:scale-95"
          >
            شروع آزمون پیشنهاد پلن
          </button>
        </div>
      )}

      {quizStep >= 1 && quizStep <= 5 && (
        <div className="space-y-6">
          <span className="text-[10px] font-black text-primary-600">سوال {quizStep} از ۵</span>
          <h4 className="text-xs font-black text-mk-strong dark:text-white sm:text-sm">
            {questions[quizStep - 1].title}
          </h4>
          <div className="grid gap-3">
            {questions[quizStep - 1].options.map((o) => (
              <button
                key={o.id}
                onClick={() => handleQuizAnswer(questions[quizStep - 1].key, o.id)}
                className="w-full rounded-xl border border-mk-line bg-mk-surface p-4 text-right text-xs font-semibold text-mk-strong transition-all hover:border-primary-500 dark:text-slate-200"
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>
      )}

      {quizStep === 6 && (
        <div className="space-y-6 text-center animate-fadeIn">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
            <Smile className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-black text-emerald-500">پیشنهاد هوشمند برسانا</span>
            <h3 className="text-sm font-black text-mk-strong dark:text-white sm:text-base">
              پلن پیشنهادی برای شما: «{getRecommendedPlan().name}»
            </h3>
          </div>
          <div className="mx-auto flex max-w-sm items-center justify-between rounded-2xl border border-mk-line bg-mk-surface p-4">
            <div className="text-right">
              <span className="block text-xs font-black text-mk-strong dark:text-white">{getRecommendedPlan().name}</span>
              <span className="text-[10px] font-bold text-mk-muted">شروع با تمام امکانات پلن</span>
            </div>
            <Link
              href={getRecommendedPlan().ctaLink}
              data-analytics-event="plan_select"
              data-analytics-location="quiz_result"
              className="rounded-xl bg-primary-600 px-4 py-2 text-[10px] font-black text-white hover:bg-primary-700"
            >
              ثبت‌نام با این پلن
            </Link>
          </div>
          <button
            onClick={resetQuiz}
            className="mx-auto flex items-center gap-1 text-[10px] font-black text-mk-muted underline hover:text-mk-strong"
          >
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
            شروع مجدد
          </button>
        </div>
      )}
    </div>
  );
}
