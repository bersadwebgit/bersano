import { Sparkles, Check, ArrowLeft, Wand2 } from 'lucide-react';
import Container from '@/components/marketing/ui/Container';
import Button from '@/components/marketing/ui/Button';

interface HeroProps {
  title: string;
  subtitle: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  reassurances: string[];
  samplePrompt: string;
  sampleResult: string;
}

/**
 * Homepage hero. Result-oriented H1, one primary CTA, honest reassurances,
 * and a server-rendered product visual (prompt -> preview) — no external image,
 * no layout shift, no client JS.
 */
export default function Hero({
  title,
  subtitle,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
  reassurances,
  samplePrompt,
  sampleResult,
}: HeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-mk-line bg-gradient-to-b from-primary-50/60 via-mk-surface to-mk-surface dark:from-primary-950/20">
      <Container className="relative z-10 py-14 sm:py-20 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Copy */}
          <div className="flex flex-col items-start gap-6 text-start">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-[11px] font-black text-primary-700 dark:bg-primary-950/50 dark:text-primary-300">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              فروشگاه‌ساز هوشمند فارسی
            </span>
            <h1 className="text-3xl font-black leading-tight tracking-tight text-mk-strong dark:text-white sm:text-4xl lg:text-[2.75rem]">
              {title}
            </h1>
            <p className="max-w-xl text-sm font-medium leading-relaxed text-mk-muted sm:text-base">
              {subtitle}
            </p>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button href={primaryHref} size="lg" analyticsEvent="hero_cta_click" analyticsLocation="hero">
                <Sparkles className="h-4 w-4 fill-amber-300 text-amber-400" aria-hidden="true" />
                {primaryLabel}
              </Button>
              <Button href={secondaryHref} variant="secondary" size="lg" analyticsEvent="demo_click" analyticsLocation="hero">
                {secondaryLabel}
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            {reassurances.length > 0 && (
              <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-bold text-mk-muted">
                {reassurances.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Product visual: prompt -> preview */}
          <div className="relative">
            <div className="rounded-3xl border border-mk-line bg-mk-surface p-4 shadow-[var(--mk-shadow-lg)] sm:p-6">
              <div className="mb-3 flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="ms-2 text-[10px] font-bold text-mk-muted">پنل مدیریت برسانا</span>
              </div>

              {/* Prompt */}
              <div className="rounded-2xl border border-primary-500/20 bg-primary-50/50 p-3.5 dark:bg-primary-950/20">
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-black text-primary-600 dark:text-primary-300">
                  <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
                  دستور شما
                </div>
                <p className="text-[13px] font-bold text-mk-strong dark:text-white">«{samplePrompt}»</p>
              </div>

              {/* Arrow */}
              <div className="my-2 flex justify-center">
                <span className="rounded-full bg-mk-surface-muted px-2 py-0.5 text-[10px] font-black text-mk-muted">
                  پیش‌نمایش ← تایید ← اجرا
                </span>
              </div>

              {/* Result preview */}
              <div className="rounded-2xl border border-mk-line bg-mk-surface-muted p-3.5">
                <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black text-emerald-600">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  نتیجه آماده تایید
                </div>
                <p className="text-[12px] font-medium leading-relaxed text-mk-muted">{sampleResult}</p>
              </div>
            </div>
            {/* soft glow */}
            <div className="absolute -right-6 -top-6 -z-10 h-40 w-40 rounded-full bg-primary-500/10 blur-3xl" />
          </div>
        </div>
      </Container>
    </section>
  );
}
