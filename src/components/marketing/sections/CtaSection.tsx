import Section from '@/components/marketing/ui/Section';
import Button from '@/components/marketing/ui/Button';
import { ShieldCheck, Clock, Sparkles } from 'lucide-react';

interface CtaSectionProps {
  title: string;
  subtitle?: string;
  primaryLabel: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  /** honest, non-numeric reassurances shown under the CTA */
  reassurances?: string[];
  analyticsLocation?: string;
}

/** Final conversion block. Server component. Single dominant primary CTA. */
export default function CtaSection({
  title,
  subtitle,
  primaryLabel,
  primaryHref = '/register',
  secondaryLabel,
  secondaryHref = '/demo',
  reassurances = ['راه‌اندازی سریع', 'بدون نیاز به کارت بانکی', 'پشتیبانی فارسی'],
  analyticsLocation = 'final_cta',
}: CtaSectionProps) {
  return (
    <Section tone="inverse" spacing="lg" ariaLabel="فراخوان نهایی">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
        <h2 className="text-2xl font-black leading-tight text-white sm:text-3xl lg:text-4xl">
          {title}
        </h2>
        {subtitle && (
          <p className="max-w-xl text-sm font-medium leading-relaxed text-slate-300 sm:text-base">
            {subtitle}
          </p>
        )}
        <div className="flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
          <Button
            href={primaryHref}
            variant="inverse"
            size="lg"
            analyticsEvent="hero_cta_click"
            analyticsLocation={analyticsLocation}
          >
            <Sparkles className="h-4 w-4 fill-amber-300 text-amber-400" aria-hidden="true" />
            {primaryLabel}
          </Button>
          {secondaryLabel && (
            <Button
              href={secondaryHref}
              variant="ghost"
              size="lg"
              className="text-white hover:bg-white/10"
              analyticsEvent="demo_click"
              analyticsLocation={analyticsLocation}
            >
              {secondaryLabel}
            </Button>
          )}
        </div>
        {reassurances.length > 0 && (
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] font-bold text-slate-400">
            {reassurances.map((item, idx) => (
              <li key={idx} className="flex items-center gap-1.5">
                {idx === 0 ? (
                  <Clock className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                )}
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}
