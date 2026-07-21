import { Check } from 'lucide-react';
import Button from '@/components/marketing/ui/Button';
import Badge from '@/components/marketing/ui/Badge';
import { cn } from '@/components/marketing/ui/cn';

export interface PricingPlanView {
  id: string;
  name: string;
  desc?: string;
  price: string;
  period?: string;
  features: string[];
  badge?: string;
  ctaText: string;
  ctaLink: string;
  highlighted?: boolean;
}

interface PricingTableProps {
  plans: PricingPlanView[];
  className?: string;
}

/** Transparent pricing cards. Server component, mobile-first responsive grid. */
export default function PricingTable({ plans, className }: PricingTableProps) {
  if (!plans?.length) return null;
  return (
    <div
      className={cn(
        'grid gap-5 sm:gap-6',
        plans.length >= 3 ? 'lg:grid-cols-3 sm:grid-cols-2' : 'sm:grid-cols-2',
        className,
      )}
    >
      {plans.map((plan) => (
        <div
          key={plan.id}
          className={cn(
            'relative flex h-full flex-col rounded-3xl border bg-mk-surface p-6 sm:p-8',
            plan.highlighted
              ? 'border-primary-500/60 shadow-[var(--mk-shadow-lg)] ring-1 ring-primary-500/30'
              : 'border-mk-line',
          )}
        >
          {plan.badge && (
            <div className="absolute -top-3 right-6">
              <Badge tone={plan.highlighted ? 'primary' : 'neutral'}>{plan.badge}</Badge>
            </div>
          )}
          <h3 className="text-lg font-black text-mk-strong dark:text-white">{plan.name}</h3>
          {plan.desc && (
            <p className="mt-1.5 text-xs font-medium leading-relaxed text-mk-muted">{plan.desc}</p>
          )}
          <div className="mt-5 flex items-end gap-1.5">
            <span className="text-3xl font-black text-mk-strong dark:text-white">{plan.price}</span>
            {plan.period && <span className="pb-1 text-xs font-bold text-mk-muted">{plan.period}</span>}
          </div>
          <ul className="mt-6 flex-1 space-y-2.5">
            {plan.features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-2 text-[13px] font-bold text-mk-muted">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" aria-hidden="true" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <div className="mt-7">
            <Button
              href={plan.ctaLink}
              variant={plan.highlighted ? 'primary' : 'secondary'}
              fullWidth
              analyticsEvent="plan_select"
              analyticsLocation={`pricing_${plan.id}`}
            >
              {plan.ctaText}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
